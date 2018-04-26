package br.ufmg.dcc.iot;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;


public class Console {
	private static int MODO_NADA = 0;
	private static int MODO_PASSIVO = 1;
	private static int MODO_ATIVO = 2;

	public static void main(String[] args) {
		ReaderService readerService = new AlienReaderService();
		ServerSocket serverSocket = new ServerSocket(5678);
		int modoAtual = MODO_NADA;
		while(True) {
	            try
	            {
	                Socket clientSocket = null;
	                clientSocket = serverSocket.accept();
	                System.out.println("Connected");

	                PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true);
	                BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));

	                String textFromClient = null;
	                String textToClient = null;
	                while (True) {
		                textFromClient = in.readLine();
						System.out.println("> " + textFromClient);
						if (textFromClient.equals("ativo")) {
							ReadingResult readingResult = readerService.doSyncReads(60);
							out.printLine("tag " + readingResult.toString());
							System.out.println("< tag " + readingResult.toString());
							out.flush();
						}
					
						if (textFromClient.equals("passivo")) {
							// iniciar modo passivo
						}
					
						if (textFromClient.equals("pararpassivo")) {
							// parar modo passivo
						}
					
						if (textFromClient.startsWith("potencia")) {
							// configurar potencia
						}
					
						if (textFromClient.startsWith("tempoleitura")) {
							// configurar tempo leitura
						}
	                }
	            }
	            catch (Exception e)
	            {
	                e.printStackTrace();
	            }
		}

		ReadingResult readingResult = readerService.doSyncReads(60);
		System.out.println(readingResult.toString());
		try {
			Thread.sleep(10000);
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		readingResult = readerService.doAsyncReads(10000);
		System.out.println(readingResult.toString());

	}

}
